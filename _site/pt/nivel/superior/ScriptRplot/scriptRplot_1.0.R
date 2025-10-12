            ####  ScriptRplot - input ###

#    Script desenvolvido com R versão 3.2.3 (2015, Ubuntu 16.04 Xenial) e ggplot2 versão 3.3.0

##########    PREÂMBULO (NÃO ALTERAR)    ##########
dados = read.csv("dados_puromycin.csv")  # importa o arquivo de dados 
library(ggplot2)
attach(dados) # sempre importar arquivo como "dados.csv"
rm(list=ls()[!ls() %in% c("dados")]) # remove os objetos da lista a cada rodada, à excessão da "dados", dessa forma, recriando os objetos para que não haja homônimos errados
jitter = geom_jitter() # definição para espalhamento de pontos

#############   GEOMA PRINCIPAL ########
tipo=geom_point # point; col; line; blank; boxplot; smooth; path; area;  polygon; rug; step; tile; violin (somente 13 são possíveis com o script)
tema=theme_classic() #grey,bw,minimal,linedraw,classic,dark,void

############# VARIÁVEIS ##############
x = conc
y = rate
# Barras de erro  #
barra_erro_superior = err
barra_erro_inferior = err
barra_erro_espessura = 0.02
# Eixos #
etiqueta_x = "conc"  # "texto"; NULL
etiqueta_y = "rate"  # "texto"; NULL
eixos_transformacao = NULL # NULL; scale_y_log10(); scale_y_sqrt(); scale_y_reverse()

# Legenda geral #
legenda_geral = 'none' # 'none' (nenhuma); NULL (todas)

############## SÍMBOLO ##############
simbolo_forma = 21 # vazio: 1-14, cheio -15-20; grupo (fica vazio)
simbolo_cor_preenchimento_todos = NA # somente forma > 20; "cor"; NA (se todos, alocar NULL para preenchimento_grupo)
simbolo_cor_preenchimento_grupo = state # somente com forma > 20; grupo; NULL (se grupo, alocar NA para preenchimento_todos)
simbolo_tamanho = 3
simbolo_transparencia = 1 # 0-1
simbolo_borda_espessura = 1
simbolo_borda_cor = "blue" # "cor"; NA
simbolo_espalhamento = NULL # NULL; jitter - evita sobreposição de pontos
simbolo_legenda = TRUE # NA (preenchimento); 'none' ou FALSE; TRUE - forma e preenchimento

#############  LINHA  ####################
linha_tipo_todos = NA # NA; "tipos" - solid;dashed;longdash;dotted;twodash;dotdash;blank
linha_cor = state
#linha_tipo_todos = NA # NA - sem linha; tipos - "solid";"dashed";"longdash";"dotted';"twodash";"dotdash";"blank"
linha_tipo_grupo = NA # NA; grupo (e NA em linha_tipo_todos)
linha_cor_todos = "orange" # "cor"; NA
linha_cor_grupo = state # NULL (preto); grupo; FALSE (red pra todos)
linha_espessura = 2
linha_transparencia = 1 # (0-1)
linha_legenda = FALSE # TRUE (cor,tipo); FALSE 

############# AJUSTES #####################

########### Ajuste Não Linear ###########
curva_grupo_aes = aes(weight = 1, colour = state) # grupo (peso, cor); NULL (todos)
curva_metodo_nls = "nls" # "nls"; NA
curva_formula_nls = y ~ Vmax * x / (Km + x) # y ~ x; y ~ poly(x, 2); y ~ log(x); y~a*x/(b+x)
curva_naolinear_sementes = list(Vmax = 200, Km = 0.2)

########### Ajuste Linear e Curvilinear  ###########
curva_metodo_outros = NA # "lm" (linear); "auto"; loess; "glm"; "gam"; NA
curva_peso = NULL # peso (linha, erro-padrao), NULL
curva_linha = "solid" # solid;dashed;longdash;dotted;twodash;dotdash;blank
curva_nivel = 1; # ondulado-suave
curva_cor_todos = "green"  # "cor"; NA (sem curva ou grupo, se houver)
curva_espessura = 0.5
curva_erro_padrao = FALSE # valor; FALSE (intervalo de confiança). APARENTEMENTE SÓ FUNCIONA COM geom CONTENDO TODOS OS PONTOS...OU NÃO
curva_legenda = TRUE; # TRUE (linha, cor); FALSE
curva_subconjunto = conc>0.1&conc<0.9 # TRUE - todos os pontos; FALSE; exemplos de subconjunto: x<= 0.5; y>2&y<7;  conc>0.1&conc<0.9; rate>110&rate<130 (somente se não "nls"); state=="treated". Pode-se usar x e y definido anteriormente ou nomes das variáveis

############## PAINEIS #################
paineis_grupo=vars(state) # grupo; NULL
#paineis_tipo=facet_grid(rows = paineis_grupo) # rows; cols
paineis_tipo=facet_wrap(~state) # ~grupo; NULL

############## IDENTIFICAÇÃO ############
titulo = NULL  # NULL; "texto"
subtitulo = NULL # NULL; "texto", fonte menor, abaixo do título
legenda_figura = NULL # "Fig - Ensaios de atividade de puromicina" # NULL; "texto", canto inferior direito do plot
legenda_figura_posicao_x = 0.8
legenda_figura_posicao_y= 0.2

############# TEXTO #####################
texto_grafico = NULL # "texto" (ex: italic(R)^2==0.75); NULL; eq (equação de ajuste)
texto_coord_x = 0.6 
texto_coord_y = 50

############# ZOOM ####################
X_min = NULL # valor; NULL
X_max = NULL # valor; NULL
Y_min = NULL # valor; NULL
Y_max = NULL # valor; NULL

###################   Script de Construção do Plot   ###################
p=ggplot(data = dados, aes(x = conc, y = rate))+tema+tipo(show.legend=simbolo_legenda,shape=simbolo_forma,size=simbolo_tamanho,alpha=simbolo_transparencia,aes(fill=simbolo_cor_preenchimento_grupo,stroke=simbolo_borda_espessura))+tipo(show.legend=simbolo_legenda,shape=simbolo_forma,size=simbolo_tamanho,alpha=simbolo_transparencia,fill=simbolo_cor_preenchimento_todos, colour = simbolo_borda_cor,aes(stroke=simbolo_borda_espessura))+geom_errorbar(width=barra_erro_espessura,aes(ymin=y-barra_erro_inferior, ymax=y+barra_erro_superior))+geom_line(size=linha_espessura,show.legend=linha_legenda,alpha=linha_transparencia,linetype=linha_tipo_todos,color=linha_cor_todos)+geom_line(size=linha_espessura,show.legend=linha_legenda,alpha=linha_transparencia,aes(linetype=linha_tipo_grupo,color=linha_cor_grupo))+labs(x=etiqueta_x,y=etiqueta_y,title=titulo,subtitle=subtitulo,caption=legenda_figura)+theme(legend.title = element_blank())+theme(legend.position = c(legenda_figura_posicao_x,legenda_figura_posicao_y
))+theme(legend.position=legenda_geral)+theme(legend.background = element_rect(colour="black",size=.5, linetype="solid"))+theme(plot.title = element_text(face = "bold",hjust=0.5))+theme(plot.caption = element_text(hjust=0))+annotate("text", x = texto_coord_x,y=texto_coord_y,label=texto_grafico,parse=TRUE)+paineis_tipo+simbolo_espalhamento+eixos_transformacao+coord_cartesian(xlim=c(X_min,X_max),ylim=c(Y_min,Y_max))+stat_smooth(data=subset(dados,curva_subconjunto),method=curva_metodo_nls,formula = curva_formula_nls, method.args =  list(formula = curva_formula_nls, start = curva_naolinear_sementes),linetype = curva_linha,se=curva_erro_padrao,span=curva_nivel,size=curva_espessura, show.legend=curva_legenda,curva_grupo_aes)+stat_smooth(colour=curva_cor_todos,linetype = curva_linha,method=curva_metodo_nls,formula = curva_formula_nls, method.args =  list(formula = curva_formula_nls, start = curva_naolinear_sementes), linetype = curva_linha, se=curva_erro_padrao,span=curva_nivel,size=curva_espessura, data=subset(dados,curva_subconjunto), show.legend=curva_legenda,curva_grupo_aes)+stat_smooth(data=subset(dados, curva_subconjunto),linetype = curva_linha,colour=curva_cor_todos,method=curva_metodo_outros, se=curva_erro_padrao,span=curva_nivel,size=curva_espessura,show.legend=curva_legenda,curva_grupo_aes)
print(p)
########################################################################

############### PLOT #################
ggsave("plot.png",dpi=300)  # tipos (pdf,png,eps,jpeg,bmp,svg)